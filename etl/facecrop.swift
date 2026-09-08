// Crop a square portrait around the detected face.
//
// Commons photos are mostly wide action shots, so a centre crop lands on a
// torso or a racket. Vision finds the actual face and we build the square
// around that, with the head sitting slightly above centre the way a portrait
// normally sits. Exits non-zero when no face is found so the caller can deal
// with the file by hand instead of shipping a bad crop.
//
//   swift etl/facecrop.swift <in> <out> <size>

import AppKit
import Vision

let args = CommandLine.arguments
guard args.count >= 4,
      let outSize = Int(args[3]) else {
    FileHandle.standardError.write("usage: facecrop <in> <out> <size>\n".data(using: .utf8)!)
    exit(2)
}
let inPath = args[1], outPath = args[2]

guard let src = NSImage(contentsOfFile: inPath),
      let cg = src.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    FileHandle.standardError.write("cannot read \(inPath)\n".data(using: .utf8)!)
    exit(3)
}

let W = CGFloat(cg.width), H = CGFloat(cg.height)

let request = VNDetectFaceRectanglesRequest()
try? VNImageRequestHandler(cgImage: cg, options: [:]).perform([request])
let faces = (request.results ?? [])

var crop: CGRect
var how: String

if let face = faces.max(by: { $0.boundingBox.width * $0.boundingBox.height
                            < $1.boundingBox.width * $1.boundingBox.height }) {
    // Vision normalises with a bottom-left origin, but CGImage.cropping(to:)
    // measures from the top-left. Without the flip every crop lands on the
    // mirrored part of the body -- shorts instead of a face.
    let b = face.boundingBox
    let fx = b.midX * W
    let fy = (1 - b.midY) * H
    let faceH = b.height * H

    // Let the face take up ~46% of the frame: tight enough to read at 44px,
    // loose enough to keep hair and shoulders in.
    var side = faceH / 0.46
    side = min(side, min(W, H))

    // Sit the eyeline above centre rather than dead centre.
    var originX = fx - side / 2
    var originY = fy - side * 0.42

    originX = max(0, min(originX, W - side))
    originY = max(0, min(originY, H - side))
    crop = CGRect(x: originX, y: originY, width: side, height: side)
    how = "face"
} else {
    // No face: refuse rather than guess.
    FileHandle.standardError.write("no face detected in \(inPath)\n".data(using: .utf8)!)
    exit(4)
}

guard let cropped = cg.cropping(to: crop) else {
    FileHandle.standardError.write("crop failed for \(inPath)\n".data(using: .utf8)!)
    exit(5)
}

// Redraw at the target size so every avatar ships identical dimensions.
let cs = CGColorSpaceCreateDeviceRGB()
guard let ctx = CGContext(data: nil, width: outSize, height: outSize,
                          bitsPerComponent: 8, bytesPerRow: 0, space: cs,
                          bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else {
    exit(6)
}
ctx.interpolationQuality = .high
ctx.draw(cropped, in: CGRect(x: 0, y: 0, width: outSize, height: outSize))

guard let out = ctx.makeImage() else { exit(7) }
let rep = NSBitmapImageRep(cgImage: out)
guard let data = rep.representation(using: .jpeg,
                                    properties: [.compressionFactor: 0.82]) else { exit(8) }
try? data.write(to: URL(fileURLWithPath: outPath))

let faceCount = faces.count
print("\(how) faces=\(faceCount) crop=\(Int(crop.width))px src=\(Int(W))x\(Int(H))")
